export default interface LayoutsConfig {
  /**
  Encoding to be used when reading a layout file from disk.

  @default 'utf8'
  */
  encoding?: string;

  /**
  Name of the slot tag, where the content will be injected.
  This is typically used in a Layout file, to define the place where to inject a Template.

  @default 'block'
  */
  slotTagName?: string;

  /**
  Name of the fill tag, inside of which content that will be injected is defined.
  This is typically used in a Template file, to extend a Layout.

  @default 'block'
  */
  fillTagName?: string;

  /**
  Path to the layouts folder, relative to the project root.

  @default 'src/layouts'
  */
  root?: string;

  /**
  Tag name to be used in HTML when extending a layout.

  @default 'extends'
  */
  tagName?: string;

}
