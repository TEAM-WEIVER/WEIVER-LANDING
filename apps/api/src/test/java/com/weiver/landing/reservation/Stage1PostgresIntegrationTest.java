package com.weiver.landing.reservation;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.weiver.landing.survey.SurveyAccessToken;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.core.io.FileSystemResource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.sql.DriverManager;
import java.util.HexFormat;
import java.util.Map;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@Testcontainers
@SpringBootTest(properties = {"app.survey-stage1-strict=false", "app.admin-token=test-token"})
@AutoConfigureMockMvc
class Stage1PostgresIntegrationTest {
    @Container static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17-alpine");
    private static final UUID LEGACY_VISITOR = UUID.randomUUID();
    private static final UUID LEGACY_SESSION = UUID.randomUUID();
    private static final UUID LEGACY_RESERVATION = UUID.randomUUID();
    @Autowired ReservationService service;
    @Autowired JdbcClient jdbc;
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @BeforeAll
    static void migrations() throws Exception {
        try (var connection = DriverManager.getConnection(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword());
             var statement = connection.createStatement()) {
            statement.execute("CREATE ROLE anon; CREATE ROLE authenticated;");
            Path migrations = Path.of("../../supabase/migrations");
            try (var paths = Files.list(migrations)) {
                for (Path path : paths.sorted().toList()) {
                    if (path.getFileName().toString().startsWith("20261012")) {
                        // A real pre-migration reservation must survive the new constraints unchanged.
                        statement.execute("INSERT INTO visitors (id) VALUES ('" + LEGACY_VISITOR + "');"
                            + "INSERT INTO landing_sessions(id,visitor_id,landing_path) VALUES ('" + LEGACY_SESSION + "','" + LEGACY_VISITOR + "','/');"
                            + "INSERT INTO reservations(id,visitor_id,session_id,reservation_type,name,email,privacy_consent_at) VALUES ('"
                            + LEGACY_RESERVATION + "','" + LEGACY_VISITOR + "','" + LEGACY_SESSION + "','QUICK_AI_INTERVIEW','legacy','legacy@example.com',now());");
                    }
                    ScriptUtils.executeSqlScript(connection, new FileSystemResource(path));
                }
            }
        }
    }

    private CreateReservationRequest request() {
        UUID visitor = UUID.randomUUID();
        UUID session = UUID.randomUUID();
        jdbc.sql("INSERT INTO visitors(id) VALUES (:id)").param("id", visitor).update();
        jdbc.sql("INSERT INTO landing_sessions(id,visitor_id,landing_path) VALUES (:id,:visitor,'/')")
            .param("id", session).param("visitor", visitor).update();
        return new CreateReservationRequest(visitor, session, "홍길동", visitor + "@example.com",
            "QUICK_AI_INTERVIEW", true, Map.of(), "FE", "entry_level", "web_frontend");
    }

    @Test
    void savesInitialSurveyAndOnlyHashWithDatabaseTimes() throws Exception {
        CreateReservationRequest req = request();
        ReservationCreatedResponse result = service.reserve(req);
        assertThat(result.surveyAccessToken()).matches("^[A-Za-z0-9_-]{43}$");
        String hash = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
            .digest(result.surveyAccessToken().getBytes(StandardCharsets.US_ASCII)));
        Map<String, Object> row = jdbc.sql("SELECT *, row_to_json(s)::text AS serialized FROM survey_responses s WHERE reservation_id=:id")
            .param("id", result.id()).query().singleRow();
        assertThat(row.get("access_token_hash")).isEqualTo(hash);
        assertThat(row.get("serialized").toString()).doesNotContain(result.surveyAccessToken());
        assertThat(row.get("status")).isEqualTo("not_started");
        assertThat(row.get("survey_version")).isEqualTo("v1");
        assertThat(row.get("answers").toString()).isEqualTo("{}");
        assertThat(row.get("started_at")).isNull();
        assertThat(row.get("skipped_at")).isNull();
        assertThat(row.get("completed_at")).isNull();
        assertThat(result.survey().updatedAt()).isEqualTo(((java.sql.Timestamp)row.get("updated_at")).toInstant());
        Map<String,Object> reservation = jdbc.sql("SELECT job_family,applicant_type,primary_role,privacy_consent_at,created_at FROM reservations WHERE id=:id")
            .param("id",result.id()).query().singleRow();
        assertThat(reservation).containsEntry("job_family","FE").containsEntry("applicant_type","entry_level").containsEntry("primary_role","web_frontend");
        assertThat(reservation.get("privacy_consent_at")).isEqualTo(reservation.get("created_at"));
        assertThatThrownBy(() -> jdbc.sql("INSERT INTO survey_responses(reservation_id,access_token_hash) VALUES (:id,:hash)")
            .param("id",result.id()).param("hash",SurveyAccessToken.generate().hash()).update())
            .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void initialSurveyFailureRollsBackReservation() {
        CreateReservationRequest req = request();
        jdbc.sql("ALTER TABLE survey_responses ADD CONSTRAINT test_reject_new_survey CHECK (false) NOT VALID").update();
        try {
            assertThatThrownBy(() -> service.reserve(req)).isInstanceOf(DataIntegrityViolationException.class);
            assertThat(jdbc.sql("SELECT count(*) FROM reservations WHERE email=:email").param("email",req.email()).query(Long.class).single()).isZero();
        } finally {
            jdbc.sql("ALTER TABLE survey_responses DROP CONSTRAINT test_reject_new_survey").update();
        }
    }

    @Test
    void duplicateEmailOnlyIs409AndCannotIssueNewToken() throws Exception {
        CreateReservationRequest req = request();
        service.reserve(req);
        Map<String,Object> body = new java.util.HashMap<>(Stage1ReservationControllerTest.request());
        body.put("visitorId",req.visitorId().toString()); body.put("sessionId",req.sessionId().toString());
        body.put("email",req.email().toUpperCase());
        mvc.perform(post("/api/v1/reservations").contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(body)))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.error").value("DUPLICATE_EMAIL"))
            .andExpect(jsonPath("$.surveyAccessToken").doesNotExist());
        assertThat(jdbc.sql("SELECT count(*) FROM survey_responses s JOIN reservations r ON r.id=s.reservation_id WHERE r.normalized_email=:email")
            .param("email",req.email()).query(Long.class).single()).isEqualTo(1);
    }

    @Test
    void foreignKeyFailureIs500InsteadOfDuplicateEmail() throws Exception {
        mvc.perform(post("/api/v1/reservations").contentType(MediaType.APPLICATION_JSON)
            .content(mapper.writeValueAsString(Stage1ReservationControllerTest.request())))
            .andExpect(status().isInternalServerError()).andExpect(jsonPath("$.error").value("INTERNAL_ERROR"));
    }

    @Test
    void legacyRowsAndLegacyRequestRemainUnclassified() {
        Map<String,Object> legacy = jdbc.sql("SELECT job_family,applicant_type,primary_role FROM reservations WHERE id=:id")
            .param("id",LEGACY_RESERVATION).query().singleRow();
        assertThat(legacy.values()).containsOnlyNulls();
        assertThat(jdbc.sql("SELECT count(*) FROM survey_responses WHERE reservation_id=:id").param("id",LEGACY_RESERVATION).query(Long.class).single()).isZero();
        CreateReservationRequest req=request();
        ReservationCreatedResponse result=service.reserve(new CreateReservationRequest(req.visitorId(),req.sessionId(),req.name(),req.email(),req.reservationType(),true,Map.of(),null,null,null));
        assertThat(result.survey()).isNull(); assertThat(result.surveyAccessToken()).isNull();
        assertThat(jdbc.sql("SELECT count(*) FROM survey_responses WHERE reservation_id=:id").param("id",result.id()).query(Long.class).single()).isZero();
    }

    @Test
    void databaseRejectsAllPartialNullCombinationsAndWrongRole() {
        for (int mask=1; mask<7; mask++) {
            String family=(mask&1)!=0 ? "FE" : null;
            String type=(mask&2)!=0 ? "entry_level" : null;
            String role=(mask&4)!=0 ? "web_frontend" : null;
            assertThatThrownBy(() -> jdbc.sql("UPDATE reservations SET job_family=:f,applicant_type=:t,primary_role=:r WHERE id=:id")
                .param("f",family).param("t",type).param("r",role).param("id",LEGACY_RESERVATION).update())
                .isInstanceOf(DataIntegrityViolationException.class);
        }
        assertThatThrownBy(() -> jdbc.sql("UPDATE reservations SET job_family='FE',applicant_type='student',primary_role='server_api' WHERE id=:id")
            .param("id",LEGACY_RESERVATION).update()).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void databaseRejectsNonObjectAnswersAndUnknownStatusAndBrowserPrivileges() {
        ReservationCreatedResponse result=service.reserve(request());
        assertThatThrownBy(() -> jdbc.sql("UPDATE survey_responses SET answers='[]'::jsonb WHERE reservation_id=:id")
            .param("id",result.id()).update()).isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(() -> jdbc.sql("UPDATE survey_responses SET status='unknown' WHERE reservation_id=:id")
            .param("id",result.id()).update()).isInstanceOf(DataIntegrityViolationException.class);
        for (String role : new String[]{"anon","authenticated"}) {
            assertThat(jdbc.sql("SELECT has_table_privilege(:role, 'public.survey_responses', 'SELECT,INSERT,UPDATE,DELETE')")
                .param("role",role).query(Boolean.class).single()).isFalse();
        }
    }
}
