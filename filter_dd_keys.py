#!/usr/bin/env python3
import re
import sys
from pathlib import Path

# Load patterns from file
patterns = []
with open('dd-keys-pattern.txt', 'r') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#'):
            patterns.append(re.compile(line, re.IGNORECASE))

def clean_message(message):
    for pattern in patterns:
        message = pattern.sub('[REMOVED_DD_KEY]', message)
    return message

def clean_content(content):
    for pattern in patterns:
        content = pattern.sub('[REMOVED_DD_KEY]', content)
    return content

def callback(blob, data):
    content = blob.data.decode('utf-8', errors='replace')
    cleaned = clean_content(content)
    if cleaned != content:
        blob.data = cleaned.encode('utf-8')
    return True
