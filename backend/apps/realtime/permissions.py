import re

CHANNEL = re.compile(r"^(?P<kind>user|listing)\.(?P<id>\d{1,18})$")


def can_subscribe(user, channel: str) -> bool:
    match = CHANNEL.match(channel)
    if not match:
        return False
    pk = int(match["id"])
    if match["kind"] == "user":
        return pk == user.pk
    from apps.listings.queries import visible_listings

    return visible_listings(user).filter(pk=pk).exists()
