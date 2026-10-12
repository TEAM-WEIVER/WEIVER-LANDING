package com.weiver.landing.reservation;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import java.util.Map;
import java.util.UUID;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ReservationController.class)
@TestPropertySource(properties = {"app.admin-token=test-token", "app.survey-stage1-strict=true"})
class Stage1StrictControllerTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @MockitoBean ReservationService service;

    @Test
    void missingSelectionIsRejectedBeforeService() throws Exception {
        Map<String, Object> req = Stage1ReservationControllerTest.request();
        req.remove("jobFamily"); req.remove("applicantType"); req.remove("primaryRole");
        mvc.perform(post("/api/v1/reservations").contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(req)))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error").value("INVALID_REQUEST"));
        verifyNoInteractions(service);
    }

    @Test
    void completeSelectionStillAccepted() throws Exception {
        when(service.reserve(any())).thenReturn(new ReservationCreatedResponse(UUID.randomUUID(), null, null));
        mvc.perform(post("/api/v1/reservations").contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Stage1ReservationControllerTest.request())))
            .andExpect(status().isCreated());
    }
}
