FROM ubuntu:16.04

RUN apt-get update -qq && apt-get install -y libcairo2-dev \
  libjpeg8-dev libpango1.0-dev libgif-dev build-essential \
  g++ libusb-1.0-0-dev curl git

RUN curl -sL https://deb.nodesource.com/setup_8.x | bash
RUN apt-get install --yes nodejs
RUN node -v
RUN npm -v

WORKDIR /usr/src
COPY ./docker-entrypoint.sh ./
COPY ./docker-run.sh ./
RUN chmod 777 /usr/src/docker-entrypoint.sh
RUN chmod 777 /usr/src/docker-run.sh

ENTRYPOINT ["/usr/src/docker-entrypoint.sh"]
CMD ["/usr/src/docker-run.sh"]
