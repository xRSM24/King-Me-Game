export const KEEP_SAVE_HEAD = "Keep your save? Enter your email!";
export const KEEP_SAVE_LEAD =
  "Ask a grown-up. This phone already has the climb. The book lets hops follow another phone.";
export const KEEP_SAVE_NEWS = "Email me about Daily and King Me news.";

export function shouldOfferKeepSave(signedIn: boolean, mode: "run" | "daily"): boolean {
  return !signedIn && mode === "run";
}

export function keepSaveFormHtml(opts: { idPrefix: string; showNotNow: boolean }): string {
  const p = opts.idPrefix;
  return `
    <form id="${p}-save-form" class="account-form keep-save">
      <h2>${KEEP_SAVE_HEAD}</h2>
      <p class="lead">${KEEP_SAVE_LEAD}</p>
      <label for="${p}-email">Email</label>
      <input id="${p}-email" name="email" type="email" autocomplete="username" inputmode="email" required maxlength="80" />
      <label for="${p}-password">Password</label>
      <input id="${p}-password" name="password" type="password" autocomplete="new-password" required minlength="8" maxlength="64" />
      <label class="keep-news"><input id="${p}-news" name="news" type="checkbox" checked /> ${KEEP_SAVE_NEWS}</label>
      <div class="account-actions">
        <button name="intent" value="signup" type="submit">Keep my save</button>
        <button class="ghost" name="intent" value="login" type="submit">I have a book</button>
      </div>
      ${opts.showNotNow ? `<button class="ghost" data-cmd="skip-keep-save" type="button">Not now</button>` : ""}
      <p class="quiet" id="${p}-save-note"></p>
    </form>`;
}
