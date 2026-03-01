export const totalCTBRegex = /CTB/g

export const numeroPrestationRegex =
  /(?:Prestation|Prestatie) ?(\w{1,4}) *(\d{1,4}) ?(\w\d{0,3}) ?(\w*)/

export const dateApplicationRegex = /(?:Date ?d'application|Toepassingsdatum) (\d{2}\/\d{2}\/\d{4})/

// Match duration header (FR/NL) and capture HH.MM
export const amplitudeWithStartRegex = /(?:Dur\u00e9e|Duur|Duree)\s*:\s*(\d{2}).(\d{2})\*/

export const startAndEndHoursRegex =
  /\*(\d{2}).(\d{2})(?:\* )?\*{5,} ?\*+(.+)\*{7} \*(\d{2}).(\d{2})/

export const detailsPrestationRegex =
  /(?:(?:(\w{2}) (\d{3,6}) )?(VoetPied|HLP|AfRelDP|AfRel|Res|UitGar|PerQuai|Taxi|Plat|VkPc|BkPr|CarWash|IdRem|KopCpDP|KopCp|Bus|RAMAN|RaManMO|TRANSFER|Transfer|StaByMO) ([A-Z]{2,6}) *-*([A-Z]{2,6})*)?(?:(?:(ER|RE|EM|ME|ZR|RZ) )?(\d{3,6}) (N|R)(\d{0,}) (\w)? ?(?:\d )?(\w{2,5}) *-(\w{2,5}))?(?:\d{3,5} (R|N)(\d{1,5}) (\w))? (\d{2}).(\d{2})-(\d{2}).(\d{2})/

// Match CTB blocks with flexible spacing.
// Day pattern (R/N + digits) is optional to catch CTB entries without days (e.g. "CTB HS *04.30").
// Period token is optional and can be a word (e.g. "I", "A", "1") or "*".
export const serieSemaineJourPeriodeRegex =
  /CTB\s+\w{1,3}\s*\d{0,2}\s*(?:(?:R|N)\d+)?\s*(?:\w+|\*)?/g

export const CTBDetailRegex = /CTB\s+(\w+)\s*(\d{1,2})?\s*(?:(R|N)(\d+))?\s*(\w+|\*)?/

export const depotRegex = /(?:Prestation|Prestatie) {1,2}(\w{2,6})/
