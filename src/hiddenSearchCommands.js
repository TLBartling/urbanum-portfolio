// Hidden Search Commands
//
// A small, isolated command table for search-bar commands that are not
// ordinary searches -- typed queries Header.jsx's existing search submit
// handler (handleSearchKeyDown) checks against this table FIRST, before
// any of its normal search / return-home branches run. A match stops the
// submission there and runs its own side effect instead; no match falls
// through to ordinary search, completely untouched. This file owns
// nothing about how search itself works -- Header.jsx's own state and
// App.jsx/metadataQueryEngine.js's queryArchive wiring are both fully
// unaware this module exists.
//
// To add another hidden command later: add one more entry to
// HIDDEN_SEARCH_COMMANDS below (a `matches` predicate plus a `run` side
// effect). Nothing else in the app -- not Header.jsx, not the search
// architecture, not this normalize() helper -- needs to change.

const HIDDEN_SEARCH_COMMANDS = [
  {
    // Typing "archive" (any case, any surrounding whitespace) into the
    // header search bar and submitting it sends the visitor straight to
    // Urbanum Studio instead of running a normal archive search.
    matches: (normalizedQuery) => normalizedQuery === "archive",
    run: () => {
      window.location.replace("https://urbanum-portfolio.vercel.app");
    },
  },
]

// Normalizes exactly per spec: case-insensitive, ignoring leading/
// trailing whitespace. An internal match ("the archive", "archived",
// "archive " followed by more text) does NOT count -- this is an exact
// command, never a substring/keyword search, so ordinary searches that
// happen to contain the word "archive" are completely unaffected.
function normalize(rawQuery) {
  return (rawQuery ?? "").trim().toLowerCase();
}

// Returns the matching command's `run` function, or null if this is an
// ordinary search term. Callers should treat a non-null return as "stop
// here": invoke it and do nothing else with this submission.
export function resolveHiddenSearchCommand(rawQuery) {
  const normalizedQuery = normalize(rawQuery);
  const command = HIDDEN_SEARCH_COMMANDS.find((entry) =>
    entry.matches(normalizedQuery),
  );
  return command ? command.run : null;
}
