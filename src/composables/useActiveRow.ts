import { ref, type InjectionKey } from 'vue';


export interface ActiveRow {
  timestamp: string;
  vessel: string | null;
  vesselId: string;
  lat: number;
  lon: number;
  mapLon: number;
  sog: number | null;
  cog: number | null;
};


// Stato di selezione condiviso tra mappa e tabella: quale riga è "attiva"
// (popup + evidenziazione), e i segnali per far scattare zoom/scroll nell'una
// o nell'altra a seconda di dove parte l'interazione.
export function useActiveRow() {
  const activeRow = ref<ActiveRow | null>(null);
  const zoomRow = ref<ActiveRow | null>(null);
  const zoomSeq = ref(0);
  // Direzione opposta di zoomToRow: quando il click parte dalla mappa (non
  // dall'hover/click in tabella), la tabella deve scorrere direttamente sulla
  // riga corrispondente. scrollSeq scatta solo in quel caso, così l'hover in
  // tabella (che chiama solo setActiveRow) non causa scroll indesiderati.
  const scrollSeq = ref(0);

  function setActiveRow(row: ActiveRow | null) {
    activeRow.value = row;
  }

  function zoomToRow(row: ActiveRow) {
    activeRow.value = row;
    zoomRow.value = row;
    //Perché se l'utente clicca due volte di fila la stessa riga, zoomRow.value riceverebbe lo stesso oggetto (stessa reference) di prima
    //un watch di Vue confronta il nuovo valore col vecchio e, se sono identici, non richiama la callback.
    //Quindi il secondo click non farebbe scattare di nuovo lo zoom.
    //Con zoomSeq invece, ogni click incrementa il numero (0→1→2→...),
    // quindi il valore è sempre diverso dal precedente e il watch scatta sempre, anche se il punto cliccato è lo stesso.
    zoomSeq.value++;
  }

  // Chiamata dal click su un punto/linea sulla mappa: aggiorna l'active row
  // (per popup + evidenziazione) e fa scattare lo scroll della tabella.
  function selectRowFromMap(row: ActiveRow) {
    activeRow.value = row;
    scrollSeq.value++;
  }

  return {
    activeRow,
    zoomRow,
    zoomSeq,
    scrollSeq,
    setActiveRow,
    zoomToRow,
    selectRowFromMap,
  };
}

export const activeRowKey: InjectionKey<ReturnType<typeof useActiveRow>> = Symbol('activeRow');
