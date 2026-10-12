package com.weiver.landing.reservation;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.weiver.landing.survey.SurveyAccessToken;
import com.weiver.landing.survey.SurveyRepository;
import com.weiver.landing.survey.SurveyResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.postgresql.util.PSQLException;
import java.util.Map;
import java.util.UUID;

@Service
public class ReservationService {
    private final ReservationRepository reservationRepo;
    private final SurveyRepository surveyRepo;
    private final ObjectMapper objectMapper;
    private final boolean strict;

    public ReservationService(ReservationRepository reservationRepo, SurveyRepository surveyRepo,
            ObjectMapper objectMapper, @Value("${app.survey-stage1-strict:false}") boolean strict) {
        this.reservationRepo = reservationRepo;
        this.surveyRepo = surveyRepo;
        this.objectMapper = objectMapper;
        this.strict = strict;
    }

    @Transactional
    public ReservationCreatedResponse reserve(CreateReservationRequest req) {
        SurveySelection.validate(req, strict);
        UUID id;
        try {
            id = reservationRepo.insert(req, toJson(req.utm()));
        } catch (DataIntegrityViolationException ex) {
            // Only the named email unique constraint is a duplicate reservation.
            // CHECK/FK failures and token-hash collisions must retain their real failure.
            Throwable cause = ex;
            while (cause != null) {
                if (cause instanceof PSQLException sql && "23505".equals(sql.getSQLState())
                        && sql.getServerErrorMessage() != null
                        && "reservations_normalized_email_key".equals(sql.getServerErrorMessage().getConstraint())) {
                    throw new DuplicateEmailException();
                }
                cause = cause.getCause();
            }
            throw ex;
        }
        if (req.jobFamily() == null) return new ReservationCreatedResponse(id, null, null);
        SurveyAccessToken token = SurveyAccessToken.generate();
        SurveyResponse survey = surveyRepo.initialize(id, req, token.hash());
        return new ReservationCreatedResponse(id, token.value(), survey);
    }

    private String toJson(Map<String, String> utm) {
        try {
            return objectMapper.writeValueAsString(utm == null ? Map.of() : utm);
        } catch (JsonProcessingException ex) {
            throw new InvalidReservationRequestException();
        }
    }
}
