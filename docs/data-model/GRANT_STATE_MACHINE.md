# Grant State Machine

## Scope

`CREATED -> ACTIVE -> REVOKED | EXPIRED | ROTATED` are the permitted grant
transitions. Terminal states cannot return to `ACTIVE`.

`StateTransitionGuardTest` checks both permitted and illegal transitions;
revocation and rotation tests verify that packages bound to stale authorization
cannot be used through the service.
