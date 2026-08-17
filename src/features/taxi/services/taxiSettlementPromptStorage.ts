import AsyncStorage from '@react-native-async-storage/async-storage';

const TAXI_SETTLEMENT_PROMPT_STORAGE_KEY =
  '@sktaxi/taxi-settlement-prompt/v1';

export interface TaxiSettlementPromptStorageState {
  dismissedUntilMs?: number;
  timeFallbackShown?: boolean;
}

type TaxiSettlementPromptStorage = Record<
  string,
  TaxiSettlementPromptStorageState
>;

let cachedStorage: TaxiSettlementPromptStorage | null = null;

const loadStorage = async (): Promise<TaxiSettlementPromptStorage> => {
  if (cachedStorage) {
    return cachedStorage;
  }

  try {
    const stored = await AsyncStorage.getItem(TAXI_SETTLEMENT_PROMPT_STORAGE_KEY);

    if (!stored) {
      cachedStorage = {};
      return cachedStorage;
    }

    const parsed = JSON.parse(stored) as TaxiSettlementPromptStorage;
    cachedStorage = parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    cachedStorage = {};
  }

  return cachedStorage;
};

export const getTaxiSettlementPromptStorageState = async (partyId: string) => {
  const storage = await loadStorage();
  return storage[partyId] ?? {};
};

export const updateTaxiSettlementPromptStorageState = async (
  partyId: string,
  updates: TaxiSettlementPromptStorageState,
) => {
  const storage = await loadStorage();
  const nextState = {
    ...storage[partyId],
    ...updates,
  };

  storage[partyId] = nextState;
  cachedStorage = storage;

  try {
    await AsyncStorage.setItem(
      TAXI_SETTLEMENT_PROMPT_STORAGE_KEY,
      JSON.stringify(storage),
    );
  } catch (error) {
    console.warn('택시 정산 안내 표시 상태를 저장하지 못했습니다.', error);
  }

  return nextState;
};
