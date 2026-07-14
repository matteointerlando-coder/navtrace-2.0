import { ref, watch, type ComputedRef, type Ref } from 'vue';
import type { QTable } from 'quasar';
import type { ActiveRow } from './useActiveRow';
import type { TableRow } from './useTableRows';

export interface RowSelectionOptions {
  rows: ComputedRef<TableRow[]>;
  tableRef: Ref<QTable | null>;
  activeRow: Ref<ActiveRow | null>;
  setActiveRow: (row: ActiveRow | null) => void;
  zoomToRow: (row: ActiveRow) => void;
  scrollSeq: Ref<number>;
}

// Gestisce hover/pin delle righe della tabella e lo scroll-into-view
// quando la selezione arriva dalla mappa (vedi scrollSeq in useActiveRow).
export function useRowSelection(options: RowSelectionOptions) {
  const { rows, tableRef, activeRow, setActiveRow, zoomToRow, scrollSeq } = options;

  const pinnedRow = ref<TableRow | null>(null);
  const hoverRow = ref<TableRow | null>(null);

  // activeRow è condiviso con la mappa: un click su un punto/linea in
  // useVesselLayers chiama setActiveRow, quindi la riga corrispondente si
  // evidenzia qui senza che tabella e mappa si conoscano direttamente.
  function isActiveRow(row: TableRow): boolean {
    return activeRow.value?.vesselId === row.vesselId && activeRow.value?.timestamp === row.timestamp;
  }

  // La riga "pinnata" (ultimo click) è anche quella espansa in tabella: un
  // secondo click sulla stessa riga la richiude, invece di ripinnarla.
  function isExpandedRow(row: TableRow): boolean {
    return pinnedRow.value?.vesselId === row.vesselId && pinnedRow.value?.timestamp === row.timestamp;
  }

  function clickRow(row: TableRow) {
    hoverRow.value = null;
    pinnedRow.value = isExpandedRow(row) ? null : row;
    zoomToRow(row);
  }

  function onRowMouseOver(row: TableRow) {
    if (hoverRow.value === row) return;

    hoverRow.value = row;
    setActiveRow(row);
  }

  function onRowMouseLeave() {
    hoverRow.value = null;
    if (pinnedRow.value) return;
    setActiveRow(null);
  }

  // scatta solo quando il click parte dalla mappa (selectRowFromMap): porta
  // direttamente la riga corrispondente nel viewport della virtual-scroll,
  // senza scroll animato.
  watch(scrollSeq, () => {
    if (!activeRow.value) return;
    const index = rows.value.findIndex(
      (row) => row.vesselId === activeRow.value!.vesselId && row.timestamp === activeRow.value!.timestamp,
    );
    if (index < 0) return;
    tableRef.value?.scrollTo(index, 'center');
  });

  return { isActiveRow, isExpandedRow, clickRow, onRowMouseOver, onRowMouseLeave };
}
