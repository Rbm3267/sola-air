// Mount functions for STUDIO_COMPONENTS, kept apart so the data module stays
// importable outside Vite (the export tests read it in Node).
import DataCard from '@sola-air-ui/ui/DataCard.sola';
import Chart from '@sola-air-ui/ui/Chart.sola';
import GaugeCard from '@sola-air-ui/ui/GaugeCard.sola';
import TactileDialCard from '@sola-air-ui/ui/TactileDialCard.sola';
import FlowWaterfall from '@sola-air-ui/ui/FlowWaterfall.sola';
import Table from '@sola-air-ui/ui/Table.sola';
import IncidentTriageMatrix from '@sola-air-ui/ui/IncidentTriageMatrix.sola';
import StreamView from '@sola-air-ui/ui/StreamView.sola';
import TextInput from '@sola-air-ui/ui/TextInput.sola';
import Select from '@sola-air-ui/ui/Select.sola';
import DatePicker from '@sola-air-ui/ui/DatePicker.sola';
import Toggle from '@sola-air-ui/ui/Toggle.sola';
import Button from '@sola-air-ui/ui/Button.sola';
import Alert from '@sola-air-ui/ui/Alert.sola';
import Badge from '@sola-air-ui/ui/Badge.sola';
import Spinner from '@sola-air-ui/ui/Spinner.sola';
import ConfidenceBadge from '@sola-air-ui/ui/ai/ConfidenceBadge.sola';
import MarkdownViewer from '@sola-air-ui/ui/MarkdownViewer.sola';
import SolaSafeHTML from '@sola-air-ui/ui/SolaSafeHTML.sola';
import IntentCard from '@sola-air-ui/ui/IntentCard.sola';
import IntentList from '@sola-air-ui/ui/IntentList.sola';
import ActionStrip from '@sola-air-ui/ui/ai/ActionStrip.sola';

export const STUDIO_MOUNTS: Record<string, (target: HTMLElement, props?: Record<string, unknown>) => (() => void) | void> = {
  DataCard, Chart, GaugeCard, TactileDialCard, FlowWaterfall, Table, IncidentTriageMatrix, StreamView, TextInput, Select, DatePicker, Toggle, Button, Alert, Badge, Spinner, ConfidenceBadge, MarkdownViewer, SolaSafeHTML, IntentCard, IntentList, ActionStrip
};
