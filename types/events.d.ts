export type beforeCreateType = (config: object) => Promise<void>;
export type beforeRenderType = (html: string, config: object, render: (html: string, config: object) => Promise<string>) => Promise<string>;
export type afterRenderType = ({ html, config }: { html: string, config: object }) => Promise<string>;
export type afterTransformersType = ({ html, config, render }: { html: string, config: object, render: (html: string, config: object) => Promise<string> }) => Promise<string>;
export type afterBuildType = ({ files, config, render }: { files: string[], config: object, render: (html: string, config: object) => Promise<string> }) => Promise<void>;
