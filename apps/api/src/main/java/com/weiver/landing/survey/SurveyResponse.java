package com.weiver.landing.survey;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record SurveyResponse(UUID reservationId, String surveyVersion, String jobFamily,
    String applicantType, String primaryRole, String status, Map<String, Object> answers,
    Instant startedAt, Instant completedAt, Instant skippedAt, Instant updatedAt) {}
