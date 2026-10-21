# -*- coding: utf-8 -*-
"""Android password generator using Kivy."""

from kivy.app import App
from kivy.uix.boxlayout import BoxLayout
from kivy.utils import platform

import random
import string


class PasswordGeneratorApp(App):
    title = 'Генератор паролей'
    
    def build(self):
        root = BoxLayout(orientation='vertical', padding=20, spacing=10)
        
        # Title
        from kivy.uix.label import Label
        title_label = Label(text='🔐 Генератор паролей', 
                           font_size='24sp', bold=True,
                           size_hint_y=None, height=40,
                           color=(0.1, 0.4, 0.8, 1))
        root.add_widget(title_label)
        
        # Length input
        length_layout = BoxLayout(size_hint_y=None, height=35)
        length_label = Label(text='Длина пароля:', font_size='16sp')
        from kivy.uix.textinput import TextInput
        length_input = TextInput(text='12', input_filter='int', 
                                multiline=False, font_size='16sp',
                                size_hint_x=0.5)
        length_layout.add_widget(length_label)
        length_layout.add_widget(length_input)
        root.add_widget(length_layout)
        
        # Character type checkboxes
        from kivy.uix.checkbox import CheckBox
        check_layout = BoxLayout(size_hint_y=None, height=35)
        chk_upper = CheckBox(active=True)
        chk_upper_label = Label(text='A-Z', font_size='14sp')
        chk_digits = CheckBox(active=True)
        chk_digits_label = Label(text='0-9', font_size='14sp')
        chk_symbols = CheckBox(active=True)
        chk_symbols_label = Label(text='!@#', font_size='14sp')
        check_layout.add_widget(chk_upper)
        check_layout.add_widget(chk_upper_label)
        check_layout.add_widget(chk_digits)
        check_layout.add_widget(chk_digits_label)
        check_layout.add_widget(chk_symbols)
        check_layout.add_widget(chk_symbols_label)
        root.add_widget(check_layout)
        
        # Generate button
        from kivy.uix.button import Button
        generate_btn = Button(text='Сгенерировать', font_size='18sp',
                             bold=True, size_hint_y=None, height=45,
                             background_color=(0.1, 0.5, 0.9, 1),
                             color=(1, 1, 1, 1))
        root.add_widget(generate_btn)
        
        # Result
        result_label = Label(text='', font_size='20sp',
                            size_hint_y=None, height=50,
                            text_size=root.size, halign='center',
                            color=(0.1, 0.6, 0.3, 1))
        root.add_widget(result_label)
        
        # Strength bar
        from kivy.uix.progressbar import ProgressBar
        strength_bar = ProgressBar(max=100, value=0,
                                   size_hint_y=None, height=10)
        strength_label = Label(text='', font_size='13sp',
                              size_hint_y=None, height=20)
        root.add_widget(strength_bar)
        root.add_widget(strength_label)
        
        def generate_password(instance):
            try:
                length = int(length_input.text)
            except (ValueError, TypeError):
                length = 12
            length = max(4, min(64, length))
            
            lower = string.ascii_lowercase
            upper = string.ascii_uppercase
            digits = string.digits
            symbols = '!@#$%^&*()-_=+[]{}|;:,.<>?/`~'
            
            pool = ''
            if chk_upper.active:
                pool += upper
            pool += lower  # always included
            if chk_digits.active:
                pool += digits
            if chk_symbols.active:
                pool += symbols
            
            if not pool:
                pool = lower + upper + digits
                chk_upper.active = True
                chk_digits.active = True
                chk_symbols.active = False
            
            password = ''.join(random.choice(pool) for _ in range(length))
            result_label.text = password
            
            # Strength score
            score = min(length, 20)
            score += 10 * (
                int(any(c in lower for c in password)) +
                int(any(c in upper for c in password)) +
                int(any(c in digits for c in password)) +
                int(any(c in symbols for c in password))
            )
            score = min(100, score)
            
            strength_bar.value = score
            if score >= 80:
                text, color = 'Надёжно', (0.1, 0.6, 0.3, 1)
            elif score >= 50:
                text, color = 'Средне', (0.8, 0.6, 0.1, 1)
            else:
                text, color = 'Слабо', (0.8, 0.2, 0.2, 1)
            strength_label.text = text
            strength_label.color = color
        
        generate_btn.bind(on_press=generate_password)
        
        return root


if __name__ == '__main__':
    PasswordGeneratorApp().run()
