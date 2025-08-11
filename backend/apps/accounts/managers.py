from django.contrib.auth.base_user import BaseUserManager

from .phone import normalize_phone


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, phone, password=None, **extra):
        user = self.model(phone=normalize_phone(phone), **extra)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()  # los vendedores entran solo por OTP
        user.save(using=self._db)
        return user

    def create_superuser(self, phone, password=None, **extra):
        extra.update(is_staff=True, is_superuser=True, role=self.model.Role.OPERATOR)
        return self.create_user(phone, password, **extra)
