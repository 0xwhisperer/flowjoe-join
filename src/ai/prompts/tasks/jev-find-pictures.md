<!--
  Jev (TypeSafe System One) picture ranking for Joe's find_pictures tool — docs/IMPLEMENTATION/JOE_FIND_PICTURES_PLAN.md.

  One `noul` per candidate picture, all in one request (batched). The pictures ride as TypeSafe image assets
  (experimental "Danger-Zone" image input); each question names its picture by reference. Two modes:
    - a TEXT description: ## queryInstructions, with {picture} and {query} filled in by joeFindPictures.js;
    - an EXAMPLE picture: it rides ONCE in the shared state as `example`, and every question points at it
      (## exampleInstructions + ## exampleTrue / ## exampleFalse). Never put the example inside each question's
      criteria — every criteria copy counts against the request limit (measured: it overflowed 27 pictures).

  The caller ranks by score and never applies a cut-off: on the 2026-10-19 trials (scripts/jevPictureTrials.mjs)
  the top-k picks were right while a 0.5 cut-off missed genuinely ambiguous pictures.

  Parsed by src/js/joeFindPictures.js through jevPromptSections.js; a missing section disables the tool.
-->

## task

Pick the reference pictures in the user's FlowJoe gallery that match what the user is looking for.

## queryInstructions

Does picture {picture} show {query}? Judge what the picture actually shows, not its file name.

## exampleInstructions

Does picture {picture} show the same kind of subject as the `example` picture?

## exampleTrue

It shows the same kind of subject as the `example` picture.

## exampleFalse

It shows a different kind of subject from the `example` picture.
