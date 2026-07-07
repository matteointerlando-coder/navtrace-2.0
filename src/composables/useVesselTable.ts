import { ref, type InjectionKey } from 'vue';


export interface ActiveRow {
  timestamp: string;
  vessel: string | null;
  lat: number;
  lon: number;
  sog: number | null;
  cog: number | null;
};


export function useVesselTable() {
  const activeRow = ref<ActiveRow | null>(null);
  const zoomRow = ref<ActiveRow | null>(null);
  const zoomSeq = ref(0);

  function setActiveRow(row: ActiveRow | null) {
    activeRow.value = row;
  }

  function zoomToRow(row: ActiveRow) {
    activeRow.value = row;
    zoomRow.value = row;
    //Perché se l'utente clicca due volte di fila la stessa riga, zoomRow.value riceverebbe lo stesso oggetto (stessa reference) di prima
    //un watch di Vue confronta il nuovo valore col vecchio e, se sono identici, non richiama la callback.
    //Quindi il secondo click non farebbe scattare di nuovo lo zoom.
    //Con zoomSeq invece, ogni click incrementa il numero (0→1→2→...), quindi il valore è sempre diverso dal precedente e il watch scatta sempre, anche se il punto cliccato è lo stesso.
    zoomSeq.value++;
  }

  return {
    activeRow,
    zoomRow,
    zoomSeq,
    setActiveRow,
    zoomToRow,
  };
}

export const vesselTableKey: InjectionKey<ReturnType<typeof useVesselTable>> = Symbol('vesselTable');