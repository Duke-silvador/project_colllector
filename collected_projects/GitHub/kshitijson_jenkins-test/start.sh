docker build -t myjenkins-blueocean:2.414.2 .

docker run --name jenkins-blueocean --restart=on-failure --detach \
  --network jenkins --env DOCKER_HOST=tcp://docker:2376 \
  --env DOCKER_CERT_PATH=/certs/client --env DOCKER_TLS_VERIFY=1 \
  --publish 8080:8080 --publish 50000:50000 \
  --volume jenkins-data:/var/jenkins_home \
  --volume jenkins-docker-certs:/certs/client:ro \
  myjenkins-blueocean:2.414.2


docker run -d --name socat \
  --network jenkins \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -p 2375:2375 \
  alpine/socat tcp-listen:2375,fork,reuseaddr unix-connect:/var/run/docker.sock