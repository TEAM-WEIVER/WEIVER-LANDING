package com.weiver.landing.reservation;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/reservations")
public class ReservationController {

    private final ReservationService reservationService;

    public ReservationController(ReservationService reservationService) {
        this.reservationService = reservationService;
    }

    @Value("${app.survey-stage1-strict:false}")
    private boolean strict;

    @PostMapping
    public ResponseEntity<ReservationCreatedResponse> reserve(@Valid @RequestBody CreateReservationRequest req) {
        SurveySelection.validate(req, strict);
        ReservationCreatedResponse response = reservationService.reserve(req);
        return ResponseEntity.status(201).cacheControl(CacheControl.noStore()).body(response);
    }
}
