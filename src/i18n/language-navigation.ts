export const TRANSIENT_LOCALE_SWITCH_PARAM = '_localeSwitch';

type SearchParams = {
  toString(): string;
};

export function getLocaleSwitchHref(
  pathname: string,
  searchParams: SearchParams,
  songId: string,
) {
  const nextSearchParams = new URLSearchParams(searchParams.toString());
  nextSearchParams.set('song', songId);
  nextSearchParams.set(TRANSIENT_LOCALE_SWITCH_PARAM, '1');

  return `${pathname}?${nextSearchParams.toString()}`;
}

export function getHrefWithoutTransientSong(currentHref: string) {
  const url = new URL(currentHref);

  if (url.searchParams.get(TRANSIENT_LOCALE_SWITCH_PARAM) !== '1') {
    return null;
  }

  url.searchParams.delete('song');
  url.searchParams.delete(TRANSIENT_LOCALE_SWITCH_PARAM);

  return `${url.pathname}${url.search}${url.hash}`;
}
