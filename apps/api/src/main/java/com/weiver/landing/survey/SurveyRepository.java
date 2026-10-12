package com.weiver.landing.survey;

import com.weiver.landing.reservation.CreateReservationRequest;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import java.util.Map;
import java.util.UUID;

@Repository
public class SurveyRepository {
    private final JdbcClient jdbc;

    public SurveyRepository(JdbcClient jdbc) { this.jdbc = jdbc; }

    public SurveyResponse initialize(UUID reservationId, CreateReservationRequest req, String tokenHash) {
        return jdbc.sql("""
            INSERT INTO survey_responses (reservation_id, access_token_hash)
            VALUES (:reservationId, :tokenHash)
            RETURNING survey_version, status, updated_at
            """)
            .param("reservationId", reservationId)
            .param("tokenHash", tokenHash)
            .query((rs, row) -> new SurveyResponse(reservationId, rs.getString("survey_version"),
                req.jobFamily(), req.applicantType(), req.primaryRole(), rs.getString("status"),
                Map.of(), null, null, null, rs.getTimestamp("updated_at").toInstant()))
            .single();
    }
}
