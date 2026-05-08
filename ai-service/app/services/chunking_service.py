import re


class ChunkingService:
    MAX_CHUNK = 800
    MIN_CHUNK = 10
    OVERLAP = 80

    def chunk(self, text: str) -> list[str]:
        paragraphs = re.split(r'\n\n+', text)
        chunks = []
        current = ""

        for para in paragraphs:
            para = para.strip()
            if not para:
                continue
            if len(current) + len(para) < self.MAX_CHUNK:
                current = (current + "\n\n" + para).strip()
            else:
                if len(current) >= self.MIN_CHUNK:
                    chunks.append(current)
                current = para

        if len(current) >= self.MIN_CHUNK:
            chunks.append(current)

        result = []
        for i, chunk in enumerate(chunks):
            if i > 0:
                overlap = chunks[i - 1][-self.OVERLAP:]
                result.append(overlap + " " + chunk)
            else:
                result.append(chunk)

        return result


chunking_service = ChunkingService()
