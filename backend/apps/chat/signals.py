from django.dispatch import Signal

# Argumentos: listing, user. Se emite cuando `user` marca como leídos los mensajes del otro lado.
messages_read = Signal()
