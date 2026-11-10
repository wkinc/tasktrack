pipeline {
  agent any
  options {
    timestamps()
    disableConcurrentBuilds()
    timeout(time: 20, unit: 'MINUTES')
  }
  parameters {
    booleanParam(name: 'SIMULATE_FAILURE', defaultValue: false,
                 description: 'Deploy a broken build to test rollback')
  }
  environment {
    DOCKERHUB_USER = 'wkin'
    IMAGE          = "${DOCKERHUB_USER}/tasktrack"
    PROD_HOST = 'taskadmin@85.211.195.131'
    PROD_URL  = 'http://85.211.195.131'
  }
  stages {
    stage('Checkout') {
      steps {
        checkout scm
        script {
          def sha = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
          env.TAG = "${env.BUILD_NUMBER}-${sha}"
        }
      }
    }
    stage('Install and Lint') {
      agent { docker { image 'node:22-alpine'; reuseNode true } }
      steps {
        sh 'npm ci'
        sh 'npm run lint'          // script by [Filled by Chan]
      }
    }
    stage('Unit Tests') {
      agent { docker { image 'node:22-alpine'; reuseNode true } }
      steps {
        sh 'npm test -- --ci --coverage'   // tests and 80% threshold by [Filled by Chan]
      }
      post {
        always { junit allowEmptyResults: true, testResults: 'junit.xml' }
      }
    }
    stage('Docker Build and Push Tag') {
      steps {
        sh 'docker build -t $IMAGE:$TAG .'
        // Credential ID 'dockerhub-creds' is added in Jenkins by [Filled by Pua]
        withCredentials([usernamePassword(credentialsId: 'dockerhub-creds',
                         usernameVariable: 'U', passwordVariable: 'P')]) {
          sh 'echo "$P" | docker login -u "$U" --password-stdin'
          sh 'docker push $IMAGE:$TAG'
        }
      }
    }
    stage('Deploy to Test') {
      // Agent label 'test' is set up by [Filled by Pua]
      agent { label 'test' }
      steps {
        sh '''
          cp docker-compose.yml scripts/*.sh /opt/tasktrack/
          chmod +x /opt/tasktrack/*.sh
          /opt/tasktrack/deploy.sh $TAG
          /opt/tasktrack/healthcheck.sh http://localhost:3000/health $TAG
        '''
      }
    }
    stage('Integration Tests') {
      agent { label 'test' }
      steps {
        sh 'npm ci'
        sh 'BASE_URL=http://localhost:3000 npm run test:integration'   // tests by [Filled by Wong]
        sh 'curl -fsS http://localhost:3000/ > /dev/null'
      }
    }
    stage('Push latest') {
      steps {
        sh 'docker tag $IMAGE:$TAG $IMAGE:latest && docker push $IMAGE:latest'
      }
    }
    stage('Deploy to Production') {
      steps {
        script { env.PROD_TOUCHED = 'true' }
        // Credential ID 'prod-ssh-key' is added in Jenkins by [Filled by Pua]
        sshagent(['prod-ssh-key']) {
          sh """
            scp -o StrictHostKeyChecking=accept-new docker-compose.yml scripts/*.sh $PROD_HOST:/opt/tasktrack/
            ssh $PROD_HOST 'chmod +x /opt/tasktrack/*.sh && FORCE_UNHEALTHY=${params.SIMULATE_FAILURE} /opt/tasktrack/deploy.sh $TAG'
          """
        }
      }
    }
    stage('Health Check') {
      steps {
        sh 'bash scripts/healthcheck.sh $PROD_URL/health $TAG'
        sshagent(['prod-ssh-key']) {
          sh 'ssh $PROD_HOST "echo $TAG > /opt/tasktrack/last_good_tag"'
        }
      }
    }
  }
  post {
    failure {
      script {
        if (env.PROD_TOUCHED == 'true') {
          sshagent(['prod-ssh-key']) {
            sh 'ssh $PROD_HOST /opt/tasktrack/rollback.sh'
          }
        }
      }
      echo 'Build failed. Check the stage view.'
    }
    success {
      echo "Deployed $TAG to production"
    }
  }
}