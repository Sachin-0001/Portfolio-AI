"""Downloads the embedding model at build time so cold starts don't fetch it.

Render build command:  pip install -r requirements.txt && python prefetch_models.py
"""
import os

from fastembed import TextEmbedding

from retrieval import DEFAULT_EMBEDDING_MODEL, embedding_cache_dir

if __name__ == '__main__':
    model = os.getenv('EMBEDDING_MODEL', DEFAULT_EMBEDDING_MODEL)
    if model.lower() == 'none':
        print('EMBEDDING_MODEL=none, nothing to prefetch')
    else:
        TextEmbedding(model, cache_dir=embedding_cache_dir())
        print(f'Prefetched {model} into {embedding_cache_dir()}')
