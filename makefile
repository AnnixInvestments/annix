.PHONY: build save clean

FE_IMAGE_NAME := annix-frontend
FE_IMAGE_TAG := latest
FE_TAR_FILE := $(FE_IMAGE_NAME)-$(FE_IMAGE_TAG).tar
FE_GZ_FILE := $(FE_TAR_FILE).gz

BE_IMAGE_NAME := annix-backend
BE_IMAGE_TAG := latest
BE_TAR_FILE := $(BE_IMAGE_NAME)-$(BE_IMAGE_TAG).tar
BE_GZ_FILE := $(BE_TAR_FILE).gz

build_fe:
	cd annix-frontend && docker buildx build --platform linux/amd64 -t $(FE_IMAGE_NAME):$(FE_IMAGE_TAG) . --load

build_be:
	cd annix-backend && docker buildx build --platform linux/amd64 -t $(BE_IMAGE_NAME):$(BE_IMAGE_TAG) . --load

save_fe: build_fe
	docker save $(FE_IMAGE_NAME):$(FE_IMAGE_TAG) -o $(FE_TAR_FILE)
	gzip $(FE_TAR_FILE)
	rm $(FE_TAR_FILE)

save_be: build_be
	docker save $(BE_IMAGE_NAME):$(BE_IMAGE_TAG) -o $(BE_TAR_FILE)
	gzip $(BE_TAR_FILE)
	rm $(BE_TAR_FILE)

clean_fe:
	rm -f $(FE_TAR_FILE) $(FE_GZ_FILE)

clean_be:
	rm -f $(BE_TAR_FILE) $(BE_GZ_FILE)

fe: save_fe

be: save_be

all: clean_fe clean_be save_fe save_be