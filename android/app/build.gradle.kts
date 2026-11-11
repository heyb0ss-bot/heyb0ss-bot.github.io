import javax.inject.Inject

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "io.github.heyb0ss.editaya"
    compileSdk = 35

    defaultConfig {
        applicationId = "io.github.heyb0ss.editaya"
        minSdk = 29
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            // Firmado con la clave de depuración para poder instalarlo directamente.
            // Para publicar en Google Play, configura tu propia clave de firma.
            signingConfig = signingConfigs.getByName("debug")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

/** Copia el editor web (../../editor) dentro de los assets del APK. */
abstract class CopyWebAssets : DefaultTask() {
    @get:InputDirectory
    @get:PathSensitive(PathSensitivity.RELATIVE)
    abstract val webDir: DirectoryProperty

    @get:OutputDirectory
    abstract val outputDir: DirectoryProperty

    @get:Inject
    abstract val fs: FileSystemOperations

    @TaskAction
    fun run() {
        fs.sync {
            from(webDir)
            into(outputDir.dir("editor"))
            exclude("sw.js")
        }
    }
}

val copyWebAssets = tasks.register<CopyWebAssets>("copyWebAssets") {
    webDir.set(rootProject.layout.projectDirectory.dir("../editor"))
}

androidComponents {
    onVariants { variant ->
        variant.sources.assets?.addGeneratedSourceDirectory(copyWebAssets, CopyWebAssets::outputDir)
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.activity:activity-ktx:1.9.3")
    implementation("androidx.webkit:webkit:1.12.1")
}
