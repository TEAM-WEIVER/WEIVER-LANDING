package com.weiver.landing.reservation;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.weiver.landing.survey.SurveyResponse;
import java.util.UUID;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ReservationCreatedResponse(UUID id, String surveyAccessToken, SurveyResponse survey) {
    @Override
    public String toString() { return "ReservationCreatedResponse[id=" + id + "]"; }
}
