/** Contrat commun des rendus 3D et 2D : ils lisent le store et envoient des actions, rien d'autre. */
export interface BoardView {
  setInteractive(on: boolean): void;
  dispose(): void;
}
