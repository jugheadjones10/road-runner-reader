/// <reference types="vite/client" />

declare module 'epubjs' {
  export interface NavItem {
    id: string;
    href: string;
    label: string;
    subitems?: NavItem[];
  }

  export interface Metadata {
    title: string;
    creator: string;
    description?: string;
    publisher?: string;
    language?: string;
    rights?: string;
    date?: string;
    modified_date?: string;
    layout?: string;
    orientation?: string;
    flow?: string;
    viewport?: string;
    spread?: string;
  }

  export interface Navigation {
    toc: NavItem[];
  }

  export interface Section {
    href: string;
    document?: Document;
    load: (request: unknown) => Promise<Document>;
    render: (request: unknown) => Promise<string>;
  }

  export interface Book {
    ready: Promise<void>;
    loaded: {
      metadata: Promise<Metadata>;
      navigation: Promise<Navigation>;
    };
    spine: {
      items: Array<{ href: string; index: number }>;
      spineItems?: Array<{ href: string; index: number }>;
      each?: (callback: (item: { href: string; index: number }) => void) => void;
      length?: number;
    };
    coverUrl(): Promise<string | null>;
    section(href: string | number): Section | null;
    load: (url: string) => Promise<unknown>;
    destroy(): void;
  }

  function ePub(input: ArrayBuffer | string): Book;
  export default ePub;
}
