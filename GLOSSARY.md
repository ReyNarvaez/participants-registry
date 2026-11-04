# Participant Registry

Internal tool where staff record study participants and find them by BMI.

## Language

**Participant**:
A person recorded in the registry with contact details and body measurements.
_Avoid_: patient, user, subject

**Staff**:
An internal team member who enters and searches participants.
_Avoid_: user, admin

**Unit**:
The unit of measure a staff member picks for a single measurement (kg or lb for weight, cm or in for height).
_Avoid_: metric, metric system

**Standard units**:
Kilograms and metres, the units every measurement is converted to before BMI is computed.
_Avoid_: canonical units, base metric

**BMI**:
Body mass index, weight in kilograms divided by height in metres squared, always computed by the system and never entered.

**Typical range**:
The span of weight or height most participants fall within, per unit. A measurement outside it is unusual, never invalid: staff are warned to check it, and can still save it.
_Avoid_: valid range, normal range, limits
