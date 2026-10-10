# What Knovra Office stores

Knovra Office should feel like an office, not like being watched. This page lists everything the
server stores, and what it never does. Update it in the same PR as any schema change.

## Stored

| Data                                           | Where                  | Why                                      | Who can see it                                          |
| ---------------------------------------------- | ---------------------- | ---------------------------------------- | ------------------------------------------------------- |
| Email and display name                         | `user`                 | Sign-in and showing who you are          | Members of your organisations                           |
| Sign-in provider id (e.g. `google:123`)        | `user.auth_subject`    | Recognising you if your email changes    | Nobody in the app                                       |
| Session token **hash**                         | `session`              | Keeping you signed in (30 days)          | Nobody; the token itself is only in your browser cookie |
| Role, job title, team                          | `membership`           | Placing you on the floor and permissions | Members of that organisation                            |
| Status (available, focus, away, meeting)       | `membership.status`    | Showing colleagues whether to walk over  | Members of that organisation                            |
| Work mode (office or home)                     | `membership.work_mode` | The office/home badge                    | Members of that organisation                            |
| Avatar colours                                 | `membership.avatar`    | Drawing your avatar                      | Members of that organisation                            |
| Desk assignment                                | `desk_assignment`      | Your desk on the floor                   | Members of that organisation                            |
| Invite email, role, expiry, and token **hash** | `invite`               | Letting someone join                     | Admins of that organisation                             |

## Never collected

- **Activity tracking.** Status is only what you set. We don't infer it from your keyboard, mouse,
  camera, microphone or screen.
- **Location.** No GPS or IP-based location. The optional city map (roadmap Phase 12) would be
  opt-in, per trip, and never stored.
- **Movement history.** Positions on the floor are live only and are not logged (from Phase 03).
- **Audio or video.** Conversations are not recorded or transcribed. Audio and video pass through the
  LiveKit media server only to the people within voice range, and your microphone is muted whenever
  nobody is near. Voice is off until you turn it on.

## Retention

- Sessions expire after 30 days, and signing out deletes the session on the server immediately.
- Invites expire after 7 days.
- Deleting a user is a soft delete (`deleted_at`) until the export and erase tools in Phase 11.

## Security notes

- Session and invite tokens are 256-bit random values, stored only as SHA-256 hashes.
- Session cookies are `HttpOnly`, `SameSite=Lax`, and `Secure` in production.
- Every organisation route is checked server-side by one function (`requireMember`). Non-members
  get "not found", so organisation ids can't be probed.
- State-changing requests need a custom header and a same-origin `Origin`, on top of SameSite cookies.
- The password-less development sign-in is disabled whenever `NODE_ENV=production`.
