// Validation for MarketEvent input to Processing Layer
import { MarketEvent } from '../../models/MarketEvent';

export function isValidMarketEvent(evt: any): evt is MarketEvent {
  return evt && typeof evt.exchange === 'string' && typeof evt.symbol === 'string' &&
    typeof evt.price === 'number' && typeof evt.volume === 'number' && typeof evt.timestamp === 'string';
}