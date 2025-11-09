# Node.js → Docker → Minikube CI/CD (simple steps)

## Goal
Build a Node.js app, create a Docker image, deploy to a local Minikube cluster. Optionally run the same GitHub Actions workflow locally with `act`.

---

## Prerequisites (on your machine)
- Git
- Docker Desktop
- Minikube
- kubectl
- PowerShell (Windows)
- (Optional) act (to run GitHub Actions locally)

---

## Project layout (root folder)
app/
├─ app.js
└─ package.json
Dockerfile
kubernetes/
├─ deployment.yaml
└─ service.yaml
.github/workflows/ci-cd.yml
.gitignore

---

## 1 — Run app locally (quick check)

cd C:\Users\DELL\app
docker build -t node-k8s-app .
docker run -d -p 3001:3001 node-k8s-app

# open http://localhost:3001
2 — Start Minikube and build image inside it

minikube start

# point PowerShell docker commands to Minikube's Docker daemon
& minikube -p minikube docker-env | Invoke-Expression

# build image inside Minikube
docker build -t <your-dockerhub-username>/node-k8s-app:latest .
Replace <your-dockerhub-username> with your Docker Hub username if you plan to push.
If you do not want to push, you can tag without username and use the same name in the deployment manifest.

3 — Edit deployment to use the correct image
Open kubernetes/deployment.yaml and set:

containers:
- name: node-k8s-container
  image: <your-dockerhub-username>/node-k8s-app:latest
  ports:
  - containerPort: 3001

4 — Deploy to Minikube

kubectl apply -f kubernetes/deployment.yaml
kubectl apply -f kubernetes/service.yaml

kubectl get pods
kubectl get svc

minikube service node-k8s-service
# opens browser to the app
5 — (Optional) Push image to Docker Hub
If you prefer Kubernetes to pull from Docker Hub:

docker login
docker tag node-k8s-app:latest <your-dockerhub-username>/node-k8s-app:latest
docker push <your-dockerhub-username>/node-k8s-app:latest
Then update deployment.yaml image to the pushed name and kubectl apply -f kubernetes/deployment.yaml.

6 — Prepare kubeconfig for GitHub Actions (portable)
Create a portable kubeconfig that embeds certificates (Windows PowerShell):

kubectl config view --minify --flatten > C:\Users\DELL\.kube\minikube-embedded.yaml
Base64-encode it and copy to clipboard:

[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((Get-Content "C:\Users\DELL\.kube\minikube-embedded.yaml" -Raw))) | clip
In your GitHub repository settings → Secrets → Actions add a new secret:

Name: KUBE_CONFIG_DATA

Value: paste the clipboard content

Also add:

DOCKERHUB_USERNAME = your Docker Hub username

DOCKERHUB_TOKEN = Docker Hub password or access token

7 — Workflow (what it does)
.github/workflows/ci-cd.yml should:

checkout code

install node deps

build docker image

login & push image to Docker Hub

create $HOME/.kube/config from KUBE_CONFIG_DATA

apply kubernetes/*.yaml

(make sure Configure kubeconfig step creates folder before writing config:

mkdir -p $HOME/.kube
echo "${{ secrets.KUBE_CONFIG_DATA }}" | base64 --decode > $HOME/.kube/config
** Push project to GitHub**
cd C:\Users\DELL\app
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo>.git
git push -u origin main
After push, go to GitHub → Actions to watch the workflow.

9 — Run the workflow locally with act (optional)
Create a local secrets file .secrets (do NOT commit it):

DOCKERHUB_USERNAME=gobinathv
DOCKERHUB_TOKEN=<token>
KUBE_CONFIG_DATA=<base64-encoded kubeconfig>
Run:

act -j build-deploy --secret-file .secrets
This runs the same workflow locally and can talk to your Minikube.

**10 — Common troubleshooting**
ErrImagePull → Kubernetes cannot find the image. Build inside Minikube or push to Docker Hub and update deployment.yaml.

kubeconfig path errors → use kubectl config view --minify --flatten to create embedded kubeconfig.

GitHub runner cannot reach Minikube → GitHub runners are remote; use act locally, or use a cloud Kubernetes cluster for real remote CI.

Cleanup

kubectl delete -f kubernetes/
minikube stop
Notes
Keep .secrets in .gitignore.

For CI on GitHub.com to deploy to a cluster, that cluster must be reachable from GitHub (Minikube is local; use act for local testing).

