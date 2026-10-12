package com.weiver.landing.reservation;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public class ReservationRepository {

    private final JdbcClient jdbc;

    public ReservationRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public UUID insert(CreateReservationRequest req, String utmJson) {
        UUID id = UUID.randomUUID();
        jdbc.sql("""
            INSERT INTO reservations
              (id, visitor_id, session_id, name, email, reservation_type, privacy_consent_at, utm, job_family, applicant_type, primary_role)
            VALUES
              (:id, :visitorId, :sessionId, :name, :email, :type, CURRENT_TIMESTAMP, :utm::jsonb, :jobFamily, :applicantType, :primaryRole)
            """)
            .param("id", id)
            .param("visitorId", req.visitorId())
            .param("sessionId", req.sessionId())
            .param("name", req.name())
            .param("email", req.email())
            .param("type", req.reservationType())
            .param("utm", utmJson)
            .param("jobFamily", req.jobFamily())
            .param("applicantType", req.applicantType())
            .param("primaryRole", req.primaryRole())
            .update();
        return id;
    }
}
