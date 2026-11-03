
.PHONY: build run clean ci

IMAGE_NAME := quotes-scraper

build:
	docker build --progress=plain -t $(IMAGE_NAME) .

run:
	docker run --rm -v "$(CURDIR)/out:/app/out" $(IMAGE_NAME)

clean:
	docker image rm $(IMAGE_NAME)
	node -e "require('fs').rmSync('out', { recursive: true, force: true })"

ci: build run
	node -e "const fs=require('fs'); const p='out/result.json'; if (!fs.existsSync(p) || fs.statSync(p).size===0) process.exit(1); const data=JSON.parse(fs.readFileSync(p,'utf8')); if (!Array.isArray(data) || data.length===0) process.exit(1); console.log('Проверка пройдена. Цитат:', data.length)"
