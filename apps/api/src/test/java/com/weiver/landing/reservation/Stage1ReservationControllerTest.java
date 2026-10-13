package com.weiver.landing.reservation;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.weiver.landing.survey.SurveyResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ReservationController.class)
@TestPropertySource(properties = {"app.admin-token=test-token", "app.survey-stage1-strict=false"})
class Stage1ReservationControllerTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @MockitoBean ReservationService service;

    static Map<String, Object> request() {
        Map<String, Object> req = new HashMap<>();
        req.put("visitorId", UUID.randomUUID().toString());
        req.put("sessionId", UUID.randomUUID().toString());
        req.put("name", "홍길동");
        req.put("email", "test@example.com");
        req.put("reservationType", "QUICK_AI_INTERVIEW");
        req.put("privacyConsent", true);
        req.put("jobFamily", "FE");
        req.put("applicantType", "entry_level");
        req.put("primaryRole", "web_frontend");
        return req;
    }

    @ParameterizedTest
    @CsvSource({
        "FE,web_frontend", "FE,mobile_cross_platform", "FE,design_system", "FE,performance_platform",
        "FE,interactive_graphics", "FE,undecided", "FE,other", "BE,server_api", "BE,distributed_systems",
        "BE,data_engineering", "BE,devops_sre", "BE,undecided", "BE,other", "AI,llm_genai",
        "AI,cv_multimodal", "AI,nlp_speech", "AI,recommendation_search", "AI,mlops_platform",
        "AI,robotics_edge", "AI,ml_engineer", "AI,research_engineer", "AI,undecided", "AI,other"
    })
    void acceptsEveryContractRole(String family, String role) throws Exception {
        Map<String, Object> req = request();
        req.put("jobFamily", family);
        req.put("primaryRole", role);
        UUID id = UUID.randomUUID();
        SurveyResponse survey = new SurveyResponse(id, "v1", family, "entry_level", role,
            "not_started", Map.of(), null, null, null, Instant.parse("2026-10-12T12:00:00Z"));
        when(service.reserve(any())).thenReturn(new ReservationCreatedResponse(id, "A".repeat(43), survey));
        mvc.perform(post("/api/v1/reservations").contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(req)))
            .andExpect(status().isCreated())
            .andExpect(header().string("Cache-Control", "no-store"))
            .andExpect(jsonPath("$.surveyAccessToken").value("A".repeat(43)))
            .andExpect(jsonPath("$.survey.jobFamily").value(family))
            .andExpect(jsonPath("$.survey.primaryRole").value(role))
            .andExpect(jsonPath("$.survey.status").value("not_started"))
            .andExpect(jsonPath("$.survey.startedAt").value(org.hamcrest.Matchers.nullValue()));
    }

    @ParameterizedTest
    @ValueSource(strings = {"student", "entry_level", "experienced", "employed_no_change", "other"})
    void acceptsEveryApplicantType(String applicantType) throws Exception {
        Map<String, Object> req = request();
        req.put("applicantType", applicantType);
        when(service.reserve(any())).thenReturn(new ReservationCreatedResponse(UUID.randomUUID(), null, null));
        mvc.perform(post("/api/v1/reservations").contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(req))).andExpect(status().isCreated());
    }

    @ParameterizedTest
    @ValueSource(strings = {"jobFamily", "applicantType", "primaryRole"})
    void rejectsPartialAndExplicitNull(String field) throws Exception {
        Map<String, Object> req = request();
        req.remove(field);
        assertInvalid(req);
        req.put(field, null);
        assertInvalid(req);
        req.put(field, 1);
        assertInvalid(req);
        req.put(field, "");
        assertInvalid(req);
        req.put(field, "UNKNOWN");
        assertInvalid(req);
        verifyNoInteractions(service);
    }

    @Test
    void rejectsAllExplicitNullAndWrongFamilyAndUnknownFields() throws Exception {
        Map<String, Object> req = request();
        req.put("primaryRole", "server_api");
        assertInvalid(req);
        req = request();
        req.put("jobFamily", null); req.put("applicantType", null); req.put("primaryRole", null);
        assertInvalid(req);
        req = request(); req.put("privacyConsentAt", "2026-10-12T12:00:00Z");
        assertInvalid(req);
        req = request(); req.put("privacyConsent", "true");
        assertInvalid(req);
        verifyNoInteractions(service);
    }

    @Test
    void malformedJsonIs400() throws Exception {
        mvc.perform(post("/api/v1/reservations").contentType(MediaType.APPLICATION_JSON).content("{"))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error").value("INVALID_REQUEST"));
    }

    @Test
    void fullyOmittedSelectionHasLegacyResponse() throws Exception {
        Map<String, Object> req = request();
        req.remove("jobFamily"); req.remove("applicantType"); req.remove("primaryRole");
        UUID id = UUID.randomUUID();
        when(service.reserve(any())).thenReturn(new ReservationCreatedResponse(id, null, null));
        mvc.perform(post("/api/v1/reservations").contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(req)))
            .andExpect(status().isCreated()).andExpect(content().json("{\"id\":\"" + id + "\"}", true));
    }

    private void assertInvalid(Map<String, Object> req) throws Exception {
        mvc.perform(post("/api/v1/reservations").contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(req)))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error").value("INVALID_REQUEST"));
    }
}
