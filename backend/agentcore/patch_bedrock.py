#!/usr/bin/env python3
import site
import os

pkg_path = os.path.join(site.getsitepackages()[0], 'aws_sdk_bedrock_runtime', 'client.py')
with open(pkg_path, 'r') as f:
    content = f.read()

if 'BedrockRuntimeClient = AsyncBedrockRuntimeClient' not in content:
    with open(pkg_path, 'a') as f:
        f.write('\n# Compatibility alias for strands-agents\nBedrockRuntimeClient = AsyncBedrockRuntimeClient\n')
    print('Patched BedrockRuntimeClient alias')
else:
    print('Already patched')
