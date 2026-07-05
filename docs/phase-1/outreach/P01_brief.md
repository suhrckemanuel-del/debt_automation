# P01 Outreach Brief

## Target

A debt-capital practitioner who has recently both prepared and reviewed answers drawn from facility agreements, amendments, waivers, or related documents.

Choose someone likely to be candid. Familiarity with Manuel is acceptable; automatic enthusiasm is not.

## Learning objective

Determine whether the three-question pack maps to a recent recurring workflow and whether citations, currentness notes, missing-information flags, and legal-review boundaries reduce combined analyst-plus-reviewer burden.

## Invitation draft

**Subject:** 45-minute review of a debt-document workflow

Hi [first name],

I’m testing a narrow debt-document workflow: whether a source-backed reviewer pack can make it faster and safer to establish the current position across a facility agreement, amendment, and waiver.

Would you be open to a 45-minute workflow-review session?

Everything used in the session is synthetic. I will not ask you to share real documents, deal terms, employer information, or other non-public material. This is an early workflow experiment, not a product demonstration or sales call.

I’ll ask you to work through three synthetic questions, review a source-backed answer pack, and give candid feedback on trust, total review burden, and whether the problem is worth pursuing.

Would either [option 1 with timezone] or [option 2 with timezone] work?

Thanks,

Manuel

## Before sending

- [ ] Replace `[first name]`
- [ ] Add two real scheduling options in Europe/Berlin time
- [ ] Confirm the person fits the P01 target profile
- [ ] Do not attach real or synthetic documents yet
- [ ] Do not describe the prototype as built or production-ready

## After sending

Add one local tracker row:

```csv
P01,[role_category],both,[YYYY-MM-DD],sent,,no,
```

Do not store the person's name or contact details in this repository.

## If accepted

1. Update the local tracker response to `accepted` and add the scheduled date.
2. Create the session record:

   ```powershell
   .\scripts\New-Phase1Session.ps1 -ParticipantId P01 -SessionDate YYYY-MM-DD
   ```

3. Send only the baseline materials required by the session protocol.
4. Keep the completed reviewer pack hidden until the assisted-review stage.

## If declined or ignored

- Record `declined`, `not_relevant`, or `no_response` accurately.
- Send at most one follow-up.
- Do not reinterpret a polite decline as product interest.
- Assign P01 to another suitable participant if needed; retain no identifying history in the repository.
