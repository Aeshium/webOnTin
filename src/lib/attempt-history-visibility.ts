const HIDDEN_BEFORE_KEY_PREFIX = "ontin-attempt-history-hidden-before:";
const VISIBILITY_CHANGE_EVENT = "ontin-attempt-history-visibility-change";

export function subscribeAttemptHistoryVisibility(
  onStoreChange: () => void
): () => void {
  window.addEventListener(VISIBILITY_CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(VISIBILITY_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

export function getAttemptHistoryHiddenBefore(userId: number): number {
  const value = Number(
    window.localStorage.getItem(`${HIDDEN_BEFORE_KEY_PREFIX}${userId}`)
  );
  return Number.isFinite(value) ? value : 0;
}

export function hideExistingAttemptHistory(userId: number): number {
  const hiddenBefore = Date.now();
  window.localStorage.setItem(
    `${HIDDEN_BEFORE_KEY_PREFIX}${userId}`,
    String(hiddenBefore)
  );
  window.dispatchEvent(new Event(VISIBILITY_CHANGE_EVENT));
  return hiddenBefore;
}
