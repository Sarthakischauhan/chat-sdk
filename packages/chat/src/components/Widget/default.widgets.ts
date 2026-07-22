import { MapWidget } from "./map.widget";
import { QuestionWidget } from "./question.widget";
import type { ChatWidgetRegistry } from "./widget.context";

export const defaultWidgets: ChatWidgetRegistry = {
  question: QuestionWidget,
  map: MapWidget,
};
