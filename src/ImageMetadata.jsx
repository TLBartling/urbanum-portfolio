// Renders only the optional Archive Item fields the Content Contract
// defines (title/caption/location/date) -- and only the ones actually
// present on this image, since the contract explicitly allows any of them
// to be missing ("Curate Later": metadata can be added over time without
// affecting functionality). Archive Number is always shown; it's the one
// field the contract guarantees every Archive Item has.
export default function ImageMetadata({ image }) {
  return (
    <div className="project-image-metadata">
      <span className="project-image-metadata__number">
        {image.archiveNumber}
      </span>
      {image.title && (
        <span className="project-image-metadata__title">{image.title}</span>
      )}
      {image.caption && (
        <p className="project-image-metadata__caption">{image.caption}</p>
      )}
      {(image.location || image.date) && (
        <p className="project-image-metadata__detail">
          {[image.location, image.date].filter(Boolean).join(" — ")}
        </p>
      )}
    </div>
  );
}
