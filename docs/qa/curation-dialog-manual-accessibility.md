# HUKM — Owner Curation Dialog Manual Accessibility Test Plan

**Status:** Prepared; manual execution not yet performed.  
**Scope:** Owner-only, read-only library curation dialog in `src/components/LibraryCurationPanel.tsx`.  
**Automation:** Static source assertions exist in `tests/staticLibrary.test.ts`; they do not replace browser, assistive-technology, or device testing.

## Test record

For every run, record date, tester, commit SHA, browser/OS/device, assistive technology and version. Mark each item **Pass**, **Fail**, or **Not run** and attach a concise reproduction for every failure. Do not mark a section complete from code inspection alone.

| Area | Status | Evidence / notes |
|---|---|---|
| Keyboard-only navigation | Not run | |
| Focus entry, containment and restoration | Not run | |
| Escape and close control | Not run | |
| Screen reader semantics and announcements | Not run | |
| 320 CSS-pixel reflow / 400% zoom | Not run | |
| Arabic/long-title content and RTL | Not run | |
| Touch and background scroll behavior | Not run | |
| Contrast, focus visibility and reduced motion | Not run | |
| Owner authorization / non-owner absence | Not run | |

## 1. Keyboard-only operation

- Open the dialog using its actual owner-only trigger with the keyboard.
- Confirm focus moves to the close button and its accessible name is announced.
- Tab through every interactive control; focus must remain within the dialog.
- Shift+Tab from the first focusable control; focus must move to the last.
- Test when focus is moved programmatically or by browser interaction outside the dialog, then press Tab and Shift+Tab; focus must return to the dialog in the expected direction.
- Press Escape; the dialog must close once, with no accidental activation of an underlying control.
- Reopen and activate the close button; focus must return to the element that opened the dialog, provided it remains in the document.
- Repeat when the opener has been removed from the DOM; closing must not throw or focus a detached node.

## 2. Screen-reader semantics

Test at minimum one desktop screen reader/browser pair available to the team (for example NVDA with Firefox or Chrome; VoiceOver with Safari on macOS is an alternative).

- Dialog is announced as a dialog and modal.
- The accessible name comes from the visible dialog heading.
- The description references the visible explanatory text and is announced appropriately.
- Close button has a meaningful Arabic accessible name.
- Reading/navigation commands do not expose background controls as part of the modal interaction.
- Arabic content is read in the intended direction; mixed Arabic/Latin titles, URLs and years remain understandable.
- Focus and close announcements are not duplicated or silent.

## 3. Reflow, zoom and responsive layout

- Test viewport widths of 320, 360, 390, 768, 1024 and 1440 CSS pixels.
- Test browser zoom at 200% and 400%; at 400%, verify the equivalent 320 CSS-pixel reflow requirement.
- No horizontal page overflow, clipped controls, inaccessible close button, overlapping header, or unreachable bottom content.
- Dialog content remains scrollable independently; keyboard focus is never hidden behind sticky/fixed elements.
- Test a long Arabic title, long author/publisher metadata, long source URL, and a candidate with a long review report.
- Verify RTL ordering, punctuation, numbers, Latin transliteration and link wrapping.

## 4. Touch and scroll behavior

- Test on at least one real iOS or Android device, not only desktop emulation.
- Swipe within the dialog; its content should scroll while the page behind it remains fixed.
- Test at the top and bottom of the dialog content to detect scroll chaining.
- Close the dialog and verify page scrolling is restored to its previous state and position.
- Rotate the device and repeat at narrow viewport dimensions.

## 5. Visual and motion checks

- Confirm visible focus indicators for every keyboard-focusable control.
- Check text, borders, controls and focus indicators against applicable contrast requirements.
- Test the system's reduced-motion preference; opening/closing must not introduce disorienting motion.
- Verify text remains readable with browser text enlargement and OS accessibility settings.

## 6. Authorization regression

- Verified owner can open the dashboard through the normal owner route.
- Ordinary reader and admin accounts cannot mount or access the owner-only panel.
- Owner preview/impersonation mode does not bypass the verified-owner requirement.
- No approval, rejection, publication, or Firestore write control appears in this read-only panel.
- Use real test accounts with known roles; never add fake users or shortcuts to production data.

## Exit criteria

- Every applicable test above is marked Pass with recorded environment and evidence.
- Every failure has a tracked issue and is fixed or explicitly accepted by the project owner.
- Repeat the affected checks after a fix and run the repository's complete tests, TypeScript check and production build on the final commit.
- Until this record is filled by a real browser/device test, the manual accessibility audit remains **Not completed**.
