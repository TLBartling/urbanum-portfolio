import { createImageUrlBuilder } from "@sanity/image-url";
import { client } from "./client.js";

// @sanity/image-url's own source deprecates the default export in favor of
// this named export ("Use the named export `createImageUrlBuilder` instead
// of the `default` export") -- using it here eliminates that deprecation
// warning. No behavior change: same builder, same API.
const builder = createImageUrlBuilder(client);

// The one place the frontend ever builds a Sanity image URL. Returns the
// @sanity/image-url builder (not a plain string) so a caller can still
// chain .width()/.height()/.url() etc. if a future consumer needs a
// specific size; queries.js's normalization calls .url() directly since
// the current frontend contract's `image` field is a plain string.
export function urlFor(source) {
  return builder.image(source);
}
