"""Catálogo español: los textos fuente ya están en español, así que cada traducción es el propio texto.

msgmerge (en makemessages) rellena las entradas nuevas con conjeturas "fuzzy" por parecido
(p. ej. "Contraoferta" → "Con oferta"); esto las reemplaza por el texto correcto. Lo usa `make messages`.
"""

from pathlib import Path

import polib

path = Path(__file__).parent / "es" / "LC_MESSAGES" / "django.po"
po = polib.pofile(str(path))
for entry in po:
    if entry.obsolete:
        continue
    entry.msgstr = entry.msgid
    if entry.msgid_plural:
        entry.msgstr_plural = {0: entry.msgid, 1: entry.msgid_plural}
    if "fuzzy" in entry.flags:
        entry.flags.remove("fuzzy")
    entry.previous_msgid = None
    entry.previous_msgctxt = None
po.save()
