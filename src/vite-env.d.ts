/// <reference types="vite/client" />
/// <reference types="vite/client" />

// Cole isso aqui embaixo:
declare module 'aurya-design-system' {
  import React from 'react';
  export const Button: React.FC<any>;
  export const Input: React.FC<any>;
  export const Select: React.FC<any>;
  export const Switch: React.FC<any>;
  export const Textarea: React.FC<any>;
  export const Table: React.FC<any>;
  export const Badge: React.FC<any>;
  export const Modal: React.FC<any>;
}