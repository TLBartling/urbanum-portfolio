import {Box, Container, Stack, Text} from '@sanity/ui'

// Deliberately plain, default @sanity/ui styling -- no custom palette or
// layout borrowed from ImportWorkspace.jsx. Milestone 2A is structural
// only ("do not redesign typography, spacing, colors"); this screen's
// visual treatment is intentionally left at Studio's own defaults until
// the editorial design pass that follows this milestone.
//
// Nothing lives behind this tool yet. It exists so "Advanced" (now
// "Settings" in the nav -- see UrbanumToolMenu.jsx) is a real, separate
// destination today -- Structure access, Vision (if reinstalled),
// dataset/API tooling, and future plugins are meant to move in here in a
// later phase, per the Milestone 2 assessment's phased plan.
//
// Terminology pass ("Library" -> "Archive"): this screen's own on-page
// heading still read "Advanced" even after the nav link itself was
// renamed to "Settings" in an earlier round -- a leftover that pass also
// caught, since it's plainly visible on screen. "Import and Library
// workflow" below is renamed to match structure.js/sanity.config.js's
// own "Archive" rename. Still deliberately plain, default @sanity/ui
// styling -- no visual changes bundled into this terminology-only pass.
//
// Prototype review pass ("Settings page," Priority 3): the body copy named
// "Josh" directly -- fine while this was a single-user prototype, but out
// of place now that the brief is "feel like Urbanum Studio," not a tool
// built around one specific person. Reworded to generic, second-person-
// free application language; the actual information conveyed (what this
// page is for, what's meant to land here later) is unchanged.
export function AdvancedPlaceholder() {
  return (
    <Container width={1} padding={6}>
      <Box paddingTop={5}>
        <Stack space={4}>
          <Text size={2} weight="semibold">
            Settings
          </Text>
          <Text size={1} muted>
            Nothing lives here yet. This is reserved for tools rarely needed
            in everyday use -- direct Structure access, developer and dataset
            tooling, and anything else better kept out of the normal Import
            and Archive workflow.
          </Text>
        </Stack>
      </Box>
    </Container>
  )
}
