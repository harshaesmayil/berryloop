import re

from django.core.exceptions import ValidationError


class ComplexityValidator:
    """Password must contain an uppercase letter, a lowercase letter and a special character."""

    def validate(self, password, user=None):
        missing = []
        if not re.search(r"[A-Z]", password):
            missing.append("an uppercase letter")
        if not re.search(r"[a-z]", password):
            missing.append("a lowercase letter")
        if not re.search(r"[^A-Za-z0-9]", password):
            missing.append("a special character")
        if missing:
            raise ValidationError("Password must contain " + ", ".join(missing) + ".")

    def get_help_text(self):
        return "Your password must contain an uppercase letter, a lowercase letter and a special character."
