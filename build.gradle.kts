import org.jetbrains.kotlin.gradle.dsl.JvmTarget

// Configuration de l'application. Le workflow GitHub la range automatiquement
// dans la structure Android standard au moment de compiler.
plugins {
    id("com.android.application") version "8.9.2"
    id("org.jetbrains.kotlin.android") version "2.1.20"
}

android {
    namespace = "com.centralhex.hexstudio"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.centralhex.hexstudio"
        minSdk = 26
        targetSdk = 35
        versionCode = 3
        versionName = "3.0.0"
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
    }
}

dependencies {
    implementation("androidx.activity:activity-ktx:1.9.3")
}
