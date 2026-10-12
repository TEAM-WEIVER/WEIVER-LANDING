package com.weiver.landing.reservation;

public class InvalidReservationRequestException extends RuntimeException {
    public InvalidReservationRequestException() { super("invalid reservation request"); }
}
